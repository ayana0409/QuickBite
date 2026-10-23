using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Identity;

namespace QuickBite.Identity.Accounts
{
    [Authorize(Roles = "admin,Admin")]
    public class AccountService : ApplicationService, IAccountService
    {
        private readonly IIdentityUserAppService _userService;
        private readonly IIdentityRoleAppService _roleService;
        private readonly IdentityUserManager _userManager;

        public AccountService(
            IIdentityRoleAppService roleService,
            IIdentityUserAppService userService,
            IdentityUserManager userManager)
        {
            _roleService = roleService;
            _userService = userService;
            _userManager = userManager;
        }

        public async Task<PagedResultDto<IdentityUserDto>> GetAll(GetIdentityUsersInput input)
            => await _userService.GetListAsync(input);

        public async Task<IdentityUserDto> GetUserAsync(Guid id)
            => await _userService.GetAsync(id);

        public async Task<IEnumerable<IdentityRoleDto>> GetRoleAsync()
            => (await _roleService.GetListAsync(new GetIdentityRolesInput())).Items;

        public async Task<IdentityUserDto> CreateUserAsync(IdentityUserCreateDto input)
            => await _userService.CreateAsync(input);

        public async Task<IdentityUserDto> UpdateUserAsync(Guid id, IdentityUserUpdateDto input)
            => await _userService.UpdateAsync(id, input);

        public async Task DeleteUserAsync(Guid id)
            => await _userService.DeleteAsync(id);

        public async Task<IEnumerable<string>> GetRoleAsync(Guid id)
            => (await _userService.GetRolesAsync(id)).Items
                                .Select(x => x.Name);

        public async Task UpdateUserRolesAsync(Guid id, List<string> roleNames)
            => await _userService.UpdateRolesAsync(id, new IdentityUserUpdateRolesDto
            {
                RoleNames = roleNames.ToArray()
            });

        /// <summary>
        /// Changes the password for an existing account by an administrator.
        /// Does not require the current password.
        /// </summary>
        public async Task ChangePasswordAsync(Guid id, ChangeUserPasswordDto input)
        {
            var user = await _userManager.GetByIdAsync(id);
            if (user == null)
            {
                throw new UserFriendlyException("User not found.");
            }

            IdentityResult result;
            if (await _userManager.HasPasswordAsync(user))
            {
                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                result = await _userManager.ResetPasswordAsync(user, resetToken, input.NewPassword);
            }
            else
            {
                result = await _userManager.AddPasswordAsync(user, input.NewPassword);
            }

            if (!result.Succeeded)
            {
                var errorMsg = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new UserFriendlyException(string.IsNullOrWhiteSpace(errorMsg) ? "Failed to change password." : errorMsg);
            }
        }
    }
}
