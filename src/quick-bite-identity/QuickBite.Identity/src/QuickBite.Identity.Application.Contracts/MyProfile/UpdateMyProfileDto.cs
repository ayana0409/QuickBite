using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.MyProfile;

/// <summary>
/// Data transfer object for updating the current user's profile.
/// </summary>
public class UpdateMyProfileDto
{
    [Required]
    [StringLength(256)]
    public string UserName { get; set; } = string.Empty;

    [StringLength(64)]
    public string? Name { get; set; }

    [StringLength(64)]
    public string? Surname { get; set; }

    [Required]
    [StringLength(32)]
    public string PhoneNumber { get; set; } = string.Empty;
}
