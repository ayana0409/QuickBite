using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Accounts;

public class EditModel : AbpPageModel
{
    private readonly IIdentityUserAppService _userService;
    private readonly IIdentityRoleAppService _roleService;

    public EditModel(IIdentityUserAppService userService, IIdentityRoleAppService roleService)
    {
        _userService = userService;
        _roleService = roleService;
    }

    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public IdentityUserUpdateDto Information { get; set; } = new();

    [BindProperty]
    public List<string> SelectedRoles { get; set; } = new();

    public List<IdentityRoleDto> AllRoles { get; set; } = new();

    public async Task OnGetAsync()
    {
        await LoadUserAsync();
        await LoadRolesAsync();
    }

    private async Task LoadUserAsync()
    {
        var user = await _userService.GetAsync(Id);

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

        var roles = await _userService.GetRolesAsync(Id);
        SelectedRoles = roles.Items
                            .Select(x => x.Name)
                            .Where(name => name != null)
                            .ToList()!;
    }

    private async Task LoadRolesAsync()
    {
        var result = await _roleService.GetListAsync(new GetIdentityRolesInput());
        AllRoles = result.Items.ToList();
    }

    // ==================== INFORMATION ====================
    public async Task<IActionResult> OnPostInformationAsync()
    {
        if (!ModelState.IsValid)
            return Page();

        try
        {
            await _userService.UpdateAsync(Id, Information);
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
            await LoadRolesAsync(); // Giữ lại danh sách roles
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
            await _userService.UpdateRolesAsync(Id, new IdentityUserUpdateRolesDto
            {
                RoleNames = [.. SelectedRoles]
            });

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
}