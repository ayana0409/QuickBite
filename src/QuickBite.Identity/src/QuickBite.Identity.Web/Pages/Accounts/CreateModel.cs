using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

public class CreateModel : AbpPageModel
{
    private readonly IIdentityUserAppService _userService;
    private readonly IIdentityRoleAppService _roleService;

    public CreateModel(IIdentityUserAppService userService, IIdentityRoleAppService roleService)
    {
        _userService = userService;
        _roleService = roleService;
    }

    [BindProperty]
    public IdentityUserCreateDto Input { get; set; } = new();

    [BindProperty]
    public List<string> SelectedRoles { get; set; } = new();

    public List<IdentityRoleDto> AllRoles { get; set; } = new();

    public async Task OnGetAsync()
    {
        await LoadRolesAsync();
        Input.IsActive = true;
    }

    private async Task LoadRolesAsync()
    {
        var result = await _roleService.GetListAsync(new GetIdentityRolesInput());
        AllRoles = result.Items.ToList();
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
            var createdUser = await _userService.CreateAsync(Input);

            if (SelectedRoles.Count != 0)
            {
                var roles = new IdentityUserUpdateRolesDto
                {
                    RoleNames = [.. SelectedRoles]
                };
                await _userService.UpdateRolesAsync(createdUser.Id, roles);
            }

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