using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Roles;

public class CreateModel : AbpPageModel
{
    private readonly IIdentityRoleAppService _roleService;

    public CreateModel(IIdentityRoleAppService roleService)
    {
        _roleService = roleService;
    }

    [BindProperty]
    public IdentityRoleCreateDto Input { get; set; } = new();

    public void OnGet()
    {
        // Giá trị mặc định
        Input.IsPublic = true;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        try
        {
            await _roleService.CreateAsync(Input);

            Alerts.Success($"Đã tạo role '{Input.Name}' thành công.");
            return RedirectToPage("./Index");
        }
        catch (AbpValidationException ex)
        {
            // Map lỗi validation về ModelState để hiển thị trên form
            foreach (var error in ex.ValidationErrors)
            {
                foreach (var member in error.MemberNames)
                {
                    ModelState.AddModelError($"Input.{member}", error.ErrorMessage ?? "Có lỗi xảy ra khi tạo role.");
                }
            }
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message ?? "Không thể tạo role. Vui lòng thử lại.");
            Logger.LogError(ex, "Error creating role {RoleName}", Input.Name);
            return Page();
        }
    }
}