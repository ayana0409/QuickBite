using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Volo.Abp.Account;
using Volo.Abp.Account.Web;
using Volo.Abp.Account.Web.Pages.Account;
using Volo.Abp.Auditing;
using Volo.Abp.Identity;
using Volo.Abp.Validation;

namespace QuickBite.Identity.Web.Pages.Account;

public class RegisterModel : Volo.Abp.Account.Web.Pages.Account.RegisterModel, IValidatableObject
{
    [BindProperty]
    [Required(ErrorMessage = "Vui lòng xác nhận lại mật khẩu.")]
    [DataType(DataType.Password)]
    [Display(Name = "Xác nhận mật khẩu")]
    [DisableAuditing]
    public string ConfirmPassword { get; set; } = string.Empty;

    public RegisterModel(
        IAccountAppService accountAppService,
        IAuthenticationSchemeProvider schemeProvider,
        IOptions<AbpAccountOptions> accountOptions,
        IdentityDynamicClaimsPrincipalContributorCache identityDynamicClaimsPrincipalContributorCache)
        : base(accountAppService, schemeProvider, accountOptions, identityDynamicClaimsPrincipalContributorCache)
    {
    }

    public override async Task<IActionResult> OnPostAsync()
    {
        ExternalProviders = await GetExternalProviders();
        await CheckSelfRegistrationAsync();

        if (!ModelState.IsValid)
        {
            return Page();
        }

        return await base.OnPostAsync();
    }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrEmpty(Input?.Password) && ConfirmPassword != Input.Password)
        {
            yield return new ValidationResult(
                "Mật khẩu xác nhận không khớp với mật khẩu đã nhập.",
                new[] { nameof(ConfirmPassword) }
            );
        }
    }
}
