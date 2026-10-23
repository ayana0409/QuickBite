using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuickBite.Identity.Accounts;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Authorization;
using Volo.Abp.Identity;

[Authorize(Roles = "admin,Admin")]
public class IndexModel : AbpPageModel
{
    private readonly IAccountService _accountService;

    public IndexModel(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [BindProperty(SupportsGet = true)]
    public string? Filter { get; set; }

    [BindProperty(SupportsGet = true)]
    public int CurrentPage { get; set; } = 1;

    public const int PageSize = 5;

    public long TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public IEnumerable<IdentityUserDto> Users { get; set; } = [];

    [BindProperty]
    public ChangePasswordModalInput ChangePasswordInput { get; set; } = new();

    public class ChangePasswordModalInput
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        try
        {
            var result = await _accountService.GetAll(
                new GetIdentityUsersInput
                {
                    Filter = Filter,
                    SkipCount = (CurrentPage - 1) * PageSize,
                    MaxResultCount = PageSize,
                    Sorting = nameof(IdentityUserDto.UserName)
                });

            Users = result.Items;

            TotalCount = result.TotalCount;

            return Page();
        }
        catch (AbpAuthorizationException)
        {
            return Redirect("/access-denied");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            ModelState.AddModelError(string.Empty, $"An error occurred: {ex.Message}");
            return Page();
        }
    }

    public async Task<IActionResult> OnPostDeleteAsync(Guid id)
    {
        try
        {
            await _accountService.DeleteUserAsync(id);

            Alerts.Success("User deleted successfully.");
            return RedirectToPage(new { Filter, CurrentPage });
        }
        catch (AbpAuthorizationException)
        {
            return Redirect("/access-denied");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            Alerts.Danger(ex.Message ?? "Failed to delete user.");
            return RedirectToPage(new { Filter, CurrentPage });
        }
    }

    /// <summary>
    /// Handles password change submission from the accounts list modal.
    /// </summary>
    public async Task<IActionResult> OnPostChangePasswordAsync()
    {
        if (string.IsNullOrWhiteSpace(ChangePasswordInput.NewPassword))
        {
            Alerts.Danger("New password cannot be empty.");
            return RedirectToPage(new { Filter, CurrentPage });
        }

        if (ChangePasswordInput.NewPassword.Length < 6)
        {
            Alerts.Danger("Password must be at least 6 characters long.");
            return RedirectToPage(new { Filter, CurrentPage });
        }

        if (ChangePasswordInput.NewPassword != ChangePasswordInput.ConfirmPassword)
        {
            Alerts.Danger("The password and confirmation password do not match.");
            return RedirectToPage(new { Filter, CurrentPage });
        }

        try
        {
            await _accountService.ChangePasswordAsync(ChangePasswordInput.UserId, new ChangeUserPasswordDto
            {
                NewPassword = ChangePasswordInput.NewPassword,
                ConfirmPassword = ChangePasswordInput.ConfirmPassword
            });

            Alerts.Success($"Successfully changed password for user '{ChangePasswordInput.UserName}'.");
            return RedirectToPage(new { Filter, CurrentPage });
        }
        catch (AbpAuthorizationException)
        {
            return Redirect("/access-denied");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            Alerts.Danger(ex.Message ?? "An error occurred while changing password.");
            return RedirectToPage(new { Filter, CurrentPage });
        }
    }
}