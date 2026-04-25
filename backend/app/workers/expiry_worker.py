"""Background worker for expiry notifications and cleanup.

Run as: python -m app.workers.expiry_worker
"""

import asyncio
import signal
import sys
from datetime import date

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Ensure the app package is importable when running as module
sys.path.insert(0, ".")

from app.config import settings
from app.database import AsyncSessionLocal
from app.repositories.item_repository import ItemRepository

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


async def check_expiring_items() -> None:
    """Check for items expiring within configured thresholds and send notifications."""
    logger.info("Running expiry check job")

    async with AsyncSessionLocal() as db:
        item_repo = ItemRepository(db)

        for threshold in settings.notification_thresholds:
            items = await item_repo.get_all_expiring(threshold)
            today = date.today()

            for item in items:
                days_left = (item.expiry_date - today).days

                if days_left < 0:
                    logger.info(
                        "Item expired",
                        item_id=str(item.id),
                        item_name=item.name,
                        household_id=str(item.household_id),
                        expired_days_ago=abs(days_left),
                    )
                elif days_left <= threshold:
                    logger.info(
                        "Item expiring soon — notification stub",
                        item_id=str(item.id),
                        item_name=item.name,
                        household_id=str(item.household_id),
                        days_until_expiry=days_left,
                        threshold=threshold,
                    )

    logger.info("Expiry check job completed")


async def cleanup_deleted_items() -> None:
    """Permanently delete items soft-deleted more than 7 days ago."""
    logger.info("Running cleanup job")

    async with AsyncSessionLocal() as db:
        item_repo = ItemRepository(db)
        count = await item_repo.cleanup_old_deleted(days=7)
        logger.info("Cleanup completed", permanently_deleted=count)


def main() -> None:
    logger.info("Starting FridgeCheck background worker")

    scheduler = AsyncIOScheduler()

    # Daily expiry check at 08:00 UTC
    scheduler.add_job(check_expiring_items, "cron", hour=8, minute=0, id="expiry_check")

    # Weekly cleanup on Sunday at 03:00 UTC
    scheduler.add_job(
        cleanup_deleted_items, "cron", day_of_week="sun", hour=3, minute=0, id="cleanup"
    )

    scheduler.start()
    logger.info("Scheduler started", jobs=[str(j) for j in scheduler.get_jobs()])

    # Run the asyncio event loop
    loop = asyncio.new_event_loop()

    def shutdown(sig: signal.Signals) -> None:
        logger.info("Received shutdown signal", signal=sig.name)
        scheduler.shutdown(wait=False)
        loop.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown, sig)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            signal.signal(sig, lambda s, f: shutdown(signal.Signals(s)))

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        scheduler.shutdown(wait=False)
        loop.close()
        logger.info("Worker stopped")


if __name__ == "__main__":
    main()
