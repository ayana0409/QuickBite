using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuickBite.Identity.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Accounts;

[Authorize(Roles = "admin,Admin")]
public class EditModel : AbpPageModel
{
    private readonly IAccountService _accountService;

    public EditModel(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public IdentityUserUpdateDto Information { get; set; } = new();

    [BindProperty]
    public List<string> SelectedRoles { get; set; } = new();

    [BindProperty]
    public ChangeUserPasswordDto PasswordInput { get; set; } = new();

    public IEnumerable<IdentityRoleDto> AllRoles { get; set; } = [];

    public async Task OnGetAsync()
    {
        await LoadUserAsync();
        await LoadRolesAsync();
    }

    private async Task LoadUserAsync()
    {
        var user = (await _accountService.GetUserAsync(Id));

        Information = new IdentityUserUpdateDto
        {
            UserName = user.UserName,
            Name = user.Name,
            Surname = user.Surname,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            LockoutEnabled = user.LockoutEnabled
        };

        SelectedRoles = (await _accountService.GetRoleAsync(Id)).ToList();
    }

    private async Task LoadRolesAsync()
    {
        AllRoles = await _accountService.GetRoleAsync();
    }

    // ==================== INFORMATION ====================
    public async Task<IActionResult> OnPostInformationAsync()
    {
        if (!ModelState.IsValid)
            return Page();

        try
        {
            await _accountService.UpdateUserAsync(Id, Information);
            Alerts.Success("Cập nhật thông tin thành công.");
            return RedirectToPage(new { id = Id });
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                foreach (var member in error.MemberNames)
                {
                    ModelState.AddModelError($"Information.{member}", error.ErrorMessage ?? "Error");
                }
            }
            await LoadRolesAsync();
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            await LoadRolesAsync();
            return Page();
        }
    }

    // ==================== ROLES ====================
    public async Task<IActionResult> OnPostRolesAsync()
    {
        try
        {
            await _accountService.UpdateUserRolesAsync(Id, SelectedRoles);

            Alerts.Success("Cập nhật vai trò thành công.");
            return RedirectToPage(new { id = Id });
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                ModelState.AddModelError(string.Empty, error.ErrorMessage ?? "Error");
            }
            await LoadUserAsync();
            await LoadRolesAsync();
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            await LoadUserAsync();
            await LoadRolesAsync();
            return Page();
        }
    }

    // ==================== PASSWORD ====================
    public async Task<IActionResult> OnPostPasswordAsync()
    {
        if (string.IsNullOrWhiteSpace(PasswordInput.NewPassword))
        {
            ModelState.AddModelError("PasswordInput.NewPassword", "New password cannot be empty.");
        }
        else if (PasswordInput.NewPassword.Length < 6)
        {
            ModelState.AddModelError("PasswordInput.NewPassword", "Password must be at least 6 characters long.");
        }

        if (PasswordInput.NewPassword != PasswordInput.ConfirmPassword)
        {
            ModelState.AddModelError("PasswordInput.ConfirmPassword", "The password and confirmation password do not match.");
        }

        if (!ModelState.IsValid && (ModelState.ContainsKey("PasswordInput.NewPassword") || ModelState.ContainsKey("PasswordInput.ConfirmPassword")))
        {
            await LoadUserAsync();
            await LoadRolesAsync();
            return Page();
        }

        try
        {
            await _accountService.ChangePasswordAsync(Id, PasswordInput);

            Alerts.Success("Password changed successfully.");
            return RedirectToPage(new { id = Id });
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                foreach (var member in error.MemberNames)
                {
                    ModelState.AddModelError($"PasswordInput.{member}", error.ErrorMessage ?? "Error");
                }
            }
            await LoadUserAsync();
            await LoadRolesAsync();
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message ?? "Failed to change password.");
            await LoadUserAsync();
            await LoadRolesAsync();
            return Page();
        }
    }
}