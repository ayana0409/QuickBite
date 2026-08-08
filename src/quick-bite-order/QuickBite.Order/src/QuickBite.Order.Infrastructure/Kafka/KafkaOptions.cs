using System;
using System.Collections.Generic;
using System.Text;

namespace QuickBite.Order.Infrastructure.Kafka
{
    public class KafkaOptions
    {
        public string BootstrapServers { get; set; } = default!;
    }
}
