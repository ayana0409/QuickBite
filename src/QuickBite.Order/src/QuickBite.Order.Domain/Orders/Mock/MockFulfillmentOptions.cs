using System;
using Microsoft.Extensions.Configuration;

namespace QuickBite.Order.Domain.Orders.Mock;

public class MockFulfillmentOptions
{
    public bool Enabled { get; set; }
    public int PreparationTimePerItemSeconds { get; set; } = 2;
    public int DeliveryTimePerKmSeconds { get; set; } = 3;

    public static MockFulfillmentOptions FromEnvOrConfig(IConfiguration configuration)
    {
        var options = new MockFulfillmentOptions();

        string? envEnabled = Environment.GetEnvironmentVariable("MOCK_FULFILLMENT_ENABLED");
        if (!string.IsNullOrWhiteSpace(envEnabled) && bool.TryParse(envEnabled, out bool enabled))
        {
            options.Enabled = enabled;
        }
        else
        {
            options.Enabled = configuration.GetValue<bool>("MockFulfillment:Enabled", true);
        }

        string? envPrepSec = Environment.GetEnvironmentVariable("MOCK_PREPARATION_TIME_PER_ITEM_SECONDS");
        if (!string.IsNullOrWhiteSpace(envPrepSec) && int.TryParse(envPrepSec, out int prepSec))
        {
            options.PreparationTimePerItemSeconds = prepSec;
        }
        else
        {
            options.PreparationTimePerItemSeconds = configuration.GetValue<int>("MockFulfillment:PreparationTimePerItemSeconds", 2);
        }

        string? envDelivSec = Environment.GetEnvironmentVariable("MOCK_DELIVERY_TIME_PER_KM_SECONDS");
        if (!string.IsNullOrWhiteSpace(envDelivSec) && int.TryParse(envDelivSec, out int delivSec))
        {
            options.DeliveryTimePerKmSeconds = delivSec;
        }
        else
        {
            options.DeliveryTimePerKmSeconds = configuration.GetValue<int>("MockFulfillment:DeliveryTimePerKmSeconds", 3);
        }

        return options;
    }
}
