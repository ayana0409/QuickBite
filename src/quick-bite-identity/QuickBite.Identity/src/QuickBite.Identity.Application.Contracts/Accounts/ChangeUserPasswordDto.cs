using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.Accounts;

/// <summary>
/// Data transfer object for changing an account password by an administrator.
/// </summary>
public class ChangeUserPasswordDto
{
    [Required]
    [StringLength(128, MinimumLength = 6)]
    [DataType(DataType.Password)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [Compare(nameof(NewPassword), ErrorMessage = "The password and confirmation password do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
