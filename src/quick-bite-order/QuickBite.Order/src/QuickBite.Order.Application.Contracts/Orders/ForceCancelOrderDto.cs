using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class ForceCancelOrderDto
{
    [Required]
    public string Reason { get; set; } = string.Empty;
}
