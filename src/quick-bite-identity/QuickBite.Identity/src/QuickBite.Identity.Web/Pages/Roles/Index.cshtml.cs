using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Roles;

[Authorize(Roles = "admin,Admin")]
public class IndexModel : AbpPageModel
{
    private readonly IIdentityRoleAppService _roleService;

    public IndexModel(IIdentityRoleAppService roleService)
    {
        _roleService = roleService;
    }

    public List<IdentityRoleDto> Roles { get; set; } = new();

    public async Task OnGetAsync()
    {
        try
        {
            var result = await _roleService.GetListAsync(new GetIdentityRolesInput());
            Roles = result.Items.ToList();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, "Không thể tải danh sách vai trò.");
            Logger.LogError(ex, "Error loading roles");
        }
    }

    public async Task<IActionResult> OnPostDeleteAsync(Guid id)
    {
        try
        {
            // Kiểm tra role có phải system role không
            var role = await _roleService.GetAsync(id);
            
            if (IsSystemRole(role.Name))
            {
                Alerts.Warning($"Không thể xóa role hệ thống: {role.Name}");
                return RedirectToPage();
            }

            await _roleService.DeleteAsync(id);
            
            Alerts.Success($"Đã xóa role '{role.Name}' thành công.");
            return RedirectToPage();
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                ModelState.AddModelError(string.Empty, error.ErrorMessage ?? "Có lỗi xảy ra khi xóa role.");
            }
            return RedirectToPage();
        }
        catch (Exception ex)
        {
            Alerts.Danger(ex.Message ?? "Không thể xóa role. Có lỗi xảy ra.");
            Logger.LogError(ex, "Error deleting role {RoleId}", id);
            return RedirectToPage();
        }
    }

    private bool IsSystemRole(string? roleName)
    {
        if (string.IsNullOrEmpty(roleName)) return false;
        
        var systemRoles = new[] { "Admin", "Moderator", "User" }; // Thêm role hệ thống của bạn
        return systemRoles.Contains(roleName, StringComparer.OrdinalIgnoreCase);
    }
}