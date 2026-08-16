using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class UpdateDeliveryAddressDto
{
    [Required]
    public DeliveryAddressDto DeliveryAddress { get; set; } = new();
}
