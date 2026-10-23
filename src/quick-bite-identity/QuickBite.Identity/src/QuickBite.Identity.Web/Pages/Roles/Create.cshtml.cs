using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Roles;

[Authorize(Roles = "admin,Admin")]
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
        // Default values
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

            Alerts.Success($"Role '{Input.Name}' created successfully.");
            return RedirectToPage("./Index");
        }
        catch (AbpValidationException ex)
        {
            // Map validation errors to ModelState for form display
            foreach (var error in ex.ValidationErrors)
            {
                foreach (var member in error.MemberNames)
                {
                    ModelState.AddModelError($"Input.{member}", error.ErrorMessage ?? "An error occurred while creating role.");
                }
            }
            return Page();
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message ?? "Failed to create role. Please try again.");
            Logger.LogError(ex, "Error creating role {RoleName}", Input.Name);
            return Page();
        }
    }
}