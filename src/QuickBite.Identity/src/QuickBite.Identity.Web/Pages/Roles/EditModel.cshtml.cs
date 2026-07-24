using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;
using Microsoft.Extensions.Logging;

namespace QuickBite.Identity.Web.Pages.Roles;

public class EditModel : AbpPageModel
{
    private readonly IIdentityRoleAppService _roleService;

    public EditModel(IIdentityRoleAppService roleService)
    {
        _roleService = roleService;
    }

    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public IdentityRoleUpdateDto Input { get; set; } = new();

    public async Task OnGetAsync()
    {
        var role = await _roleService.GetAsync(Id);
        
        Input = new IdentityRoleUpdateDto
        {
            Name = role.Name,
            IsDefault = role.IsDefault,
            IsPublic = role.IsPublic
        };
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        try
        {
            // Ngăn sửa tên role hệ thống nếu cần
            if (IsSystemRole(Input.Name))
            {
                Alerts.Warning("Không thể sửa tên role hệ thống.");
                return Page();
            }

            await _roleService.UpdateAsync(Id, Input);

            Alerts.Success($"Cập nhật role '{Input.Name}' thành công.");
            return RedirectToPage("./Index");
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                foreach (var member in error.MemberNames)
                {
                    ModelState.AddModelError($"Input.{member}", error.ErrorMessage);
                }
            }
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message ?? "Không thể cập nhật role.");
            return Page();
        }
    }

    private bool IsSystemRole(string? roleName)
    {
        if (string.IsNullOrEmpty(roleName)) return false;
        var systemRoles = new[] { "Admin", "Moderator" };
        return systemRoles.Contains(roleName, StringComparer.OrdinalIgnoreCase);
    }
}