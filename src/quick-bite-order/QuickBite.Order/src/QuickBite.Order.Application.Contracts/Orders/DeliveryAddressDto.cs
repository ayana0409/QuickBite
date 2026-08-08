using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class DeliveryAddressDto
{
    [Required]
    public string ReceiverName { get; set; } = string.Empty;

    [Required]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    public string AddressLine { get; set; } = string.Empty;

    [Required]
    public string Ward { get; set; } = string.Empty;

    [Required]
    public string District { get; set; } = string.Empty;

    [Required]
    public string Province { get; set; } = string.Empty;

    public string? Note { get; set; }
}