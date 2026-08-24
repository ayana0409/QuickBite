using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.Application.Contracts.Auth;

public class GoogleLoginDto
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
