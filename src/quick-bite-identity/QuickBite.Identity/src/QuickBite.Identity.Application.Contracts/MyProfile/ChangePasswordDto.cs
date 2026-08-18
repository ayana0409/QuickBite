using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.MyProfile;

/// <summary>
/// Data transfer object for changing the current user's password.
/// </summary>
public class ChangePasswordDto
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;
}
