using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using QuickBite.Identity.MyProfile;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Identity;
using Volo.Abp.Users;

namespace QuickBite.Identity.MyProfile;

/// <summary>
/// Application service implementing profile management for the currently authenticated user.
/// Extracts user identity securely from JWT claims via CurrentUser.
/// </summary>
[Authorize]
public class MyProfileAppService : ApplicationService, IMyProfileAppService
{
    private readonly IdentityUserManager _userManager;

    public MyProfileAppService(IdentityUserManager userManager)
    {
        _userManager = userManager;
    }

    /// <summary>
    /// Gets the current authenticated user's profile.
    /// </summary>
    public async Task<MyProfileDto> GetAsync()
    {
        var currentUserId = CurrentUser.GetId();
        var user = await _userManager.GetByIdAsync(currentUserId);
        if (user == null)
        {
            throw new UserFriendlyException("User profile not found.");
        }

        return new MyProfileDto
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Name = user.Name,
            Surname = user.Surname,
            PhoneNumber = user.PhoneNumber,
            PhoneNumberConfirmed = user.PhoneNumberConfirmed,
            EmailConfirmed = user.EmailConfirmed
        };
    }

    /// <summary>
    /// Updates the current authenticated user's profile details (UserName, PhoneNumber, Name, Surname).
    /// </summary>
    public async Task<MyProfileDto> UpdateAsync(UpdateMyProfileDto input)
    {
        var currentUserId = CurrentUser.GetId();
        var user = await _userManager.GetByIdAsync(currentUserId);
        if (user == null)
        {
            throw new UserFriendlyException("User profile not found.");
        }

        // Update UserName if changed
        if (!string.Equals(user.UserName, input.UserName, StringComparison.OrdinalIgnoreCase))
        {
            var setUserNameResult = await _userManager.SetUserNameAsync(user, input.UserName);
            if (!setUserNameResult.Succeeded)
            {
                var errorMsg = string.Join("; ", setUserNameResult.Errors.Select(e => e.Description));
                throw new UserFriendlyException(string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update username." : errorMsg);
            }
        }

        // Update PhoneNumber
        var setPhoneResult = await _userManager.SetPhoneNumberAsync(user, input.PhoneNumber);
        if (!setPhoneResult.Succeeded)
        {
            var errorMsg = string.Join("; ", setPhoneResult.Errors.Select(e => e.Description));
            throw new UserFriendlyException(string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update phone number." : errorMsg);
        }

        // Update Name and Surname
        user.Name = input.Name;
        user.Surname = input.Surname;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            var errorMsg = string.Join("; ", updateResult.Errors.Select(e => e.Description));
            throw new UserFriendlyException(string.IsNullOrWhiteSpace(errorMsg) ? "Failed to update user profile." : errorMsg);
        }

        return new MyProfileDto
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Name = user.Name,
            Surname = user.Surname,
            PhoneNumber = user.PhoneNumber,
            PhoneNumberConfirmed = user.PhoneNumberConfirmed,
            EmailConfirmed = user.EmailConfirmed
        };
    }

    /// <summary>
    /// Changes the current authenticated user's password.
    /// </summary>
    public async Task ChangePasswordAsync(ChangePasswordDto input)
    {
        var currentUserId = CurrentUser.GetId();
        var user = await _userManager.GetByIdAsync(currentUserId);
        if (user == null)
        {
            throw new UserFriendlyException("User profile not found.");
        }

        var result = await _userManager.ChangePasswordAsync(user, input.CurrentPassword, input.NewPassword);
        if (!result.Succeeded)
        {
            var errorMsg = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new UserFriendlyException(string.IsNullOrWhiteSpace(errorMsg) ? "Incorrect current password or invalid new password." : errorMsg);
        }
    }
}
