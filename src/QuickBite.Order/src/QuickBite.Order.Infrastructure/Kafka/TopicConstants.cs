namespace QuickBite.Order.Infrastructure.Kafka
{
    public static class TopicConstants
    {
        /// <summary>Catalog events topic from Catalog Service (food.item.synced, menu.updated, etc.)</summary>
        public const string CatalogEventsTopic = "catalog-events";

        /// <summary>Order lifecycle events topic from Order Service (order.created, order.confirmed, etc.)</summary>
        public const string OrderEventsTopic = "order-events";

        /// <summary>Consolidated fulfillment events topic from Payment & Inventory services (payment.*, stock.*)</summary>
        public const string FulfillmentEventsTopic = "fulfillment-events";

        /// <summary>Notification events topic (notification.created, notification.sent, etc.)</summary>
        public const string NotificationEventsTopic = "notification-events";

        /* TOPIC 5: RESERVED FOR FUTURE EXTENSION (e.g. delivery-events) */
    }
}
