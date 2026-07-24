
using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.Web.Pages.Auth;

public class LoginInputModel
{
    [Required]
    public string UserNameOrEmailAddress { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; }
}