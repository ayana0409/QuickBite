using Microsoft.AspNetCore.Mvc;
using QuickBite.Identity.Accounts;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

public class CreateModel : AbpPageModel
{
    private readonly IAccountService _accountService;

    public CreateModel(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [BindProperty]
    public IdentityUserCreateDto Input { get; set; } = new();

    [BindProperty]
    public List<string> SelectedRoles { get; set; } = new();

    public IEnumerable<IdentityRoleDto> AllRoles { get; set; } = [];

    public async Task OnGetAsync()
    {
        await LoadRolesAsync();
        Input.IsActive = true;
    }

    private async Task LoadRolesAsync()
    {
        AllRoles = await _accountService.GetRoleAsync();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            await LoadRolesAsync();
            return Page();
        }

        try
        {
            Input.IsActive = true;
            Input.RoleNames = [.. SelectedRoles];
            await _accountService.CreateUserAsync(Input);

            Alerts.Success("Tạo tài khoản thành công.");
            return RedirectToPage("Index");
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                foreach (var member in error.MemberNames)
                {
                    ModelState.AddModelError($"Input.{member}", error.ErrorMessage ?? "Error");
                }
            }
            await LoadRolesAsync();
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message ?? "Đã xảy ra lỗi khi tạo tài khoản.");
            await LoadRolesAsync();
            return Page();
        }
    }

}