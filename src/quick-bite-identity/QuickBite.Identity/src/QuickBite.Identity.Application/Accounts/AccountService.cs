using Microsoft.VisualBasic;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Identity;

namespace QuickBite.Identity.Accounts
{
    public class AccountService : ApplicationService, IAccountService
    {
        private readonly IIdentityUserAppService _userService;
        private readonly IIdentityRoleAppService _roleService;

        public AccountService(IIdentityRoleAppService roleService, IIdentityUserAppService userService)
        {
            _roleService = roleService;
            _userService = userService;
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

    }
}
