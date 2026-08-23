using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Identity;
using Volo.Abp.PermissionManagement;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Roles;

[Authorize(Roles = "admin,Admin")]
public class EditModel : AbpPageModel
{
    private readonly IIdentityRoleAppService _roleService;
    private readonly IPermissionAppService _permissionAppService;

    public EditModel(
        IIdentityRoleAppService roleService,
        IPermissionAppService permissionAppService)
    {
        _roleService = roleService;
        _permissionAppService = permissionAppService;
    }

    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public IdentityRoleUpdateDto Information { get; set; } = new();

    [BindProperty]
    public List<string> SelectedPermissions { get; set; } = new();

    public List<PermissionGroupDto> PermissionGroups { get; set; } = new();

    public async Task OnGetAsync()
    {
        await LoadInformationAsync();
        await LoadPermissionsAsync();
    }

    private async Task LoadInformationAsync()
    {
        var role = await _roleService.GetAsync(Id);
        Information = new IdentityRoleUpdateDto
        {
            Name = role.Name,
            IsDefault = role.IsDefault,
            IsPublic = role.IsPublic
        };
    }

    private async Task LoadPermissionsAsync()
    {
        var role = await _roleService.GetAsync(Id);

        var result = await _permissionAppService.GetAsync(
            "R",
            role.Name
        );

        PermissionGroups = result.Groups.ToList();

        SelectedPermissions = result.Groups
            .SelectMany(x => x.Permissions)
            .Where(x => x.IsGranted)
            .Select(x => x.Name)
            .ToList();
    }

    // ==================== TAB INFORMATION ====================
    public async Task<IActionResult> OnPostInformationAsync()
    {
        if (!ModelState.IsValid)
        {
            await LoadPermissionsAsync();
            return Page();
        }

        try
        {
            await _roleService.UpdateAsync(Id, Information);
            Alerts.Success("Cập nhật thông tin role thành công.");
            return RedirectToPage(new { id = Id });
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                ModelState.AddModelError($"Information.{error.MemberNames}", error.ErrorMessage ?? "Error"); // Sửa member
            }
            await LoadPermissionsAsync();
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            await LoadPermissionsAsync();
            return Page();
        }
    }

    // ==================== TAB PERMISSIONS ====================
    public async Task<IActionResult> OnPostPermissionsAsync()
    {
        try
        {
            // Lấy thông tin role
            var role = await _roleService.GetAsync(Id);

            // Load toàn bộ permission của role
            var permissionResult = await _permissionAppService.GetAsync(
                RolePermissionValueProvider.ProviderName,
                role.Name
            );

            // Mapping sang DTO update
            var updateDto = new UpdatePermissionsDto
            {
                Permissions = permissionResult.Groups
                    .SelectMany(g => g.Permissions)
                    .Select(p => new UpdatePermissionDto
                    {
                        Name = p.Name,

                        // Checkbox nào được tick thì grant
                        IsGranted = SelectedPermissions.Contains(p.Name)
                    })
                    .ToArray()
            };

            // Update permission
            await _permissionAppService.UpdateAsync(
                RolePermissionValueProvider.ProviderName,
                role.Name,
                updateDto
            );

            Alerts.Success("Cập nhật quyền thành công.");

            return RedirectToPage(new { id = Id });
        }
        catch (AbpValidationException ex)
        {
            foreach (var error in ex.ValidationErrors)
            {
                ModelState.AddModelError(
                    string.Empty,
                    error.ErrorMessage
                );
            }

            await LoadInformationAsync();
            await LoadPermissionsAsync();

            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(
                string.Empty,
                ex.Message
            );

            await LoadInformationAsync();
            await LoadPermissionsAsync();

            return Page();
        }
    }
}