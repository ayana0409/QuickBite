using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace QuickBite.Order.Extensions;

public static class RepositoryExtensions
{
    /// <summary>
    /// Safely fetches entities by a collection of Primary Keys in a SINGLE SQL batch query (WHERE Id = ... OR Id = ...)
    /// avoiding EF Core primitive collection parameter mapping issues with MySQL.
    /// </summary>
    public static async Task<List<TEntity>> GetListByIdsAsync<TEntity, TKey>(
        this IRepository<TEntity, TKey> repository,
        IEnumerable<TKey> ids)
        where TEntity : class, IEntity<TKey>
    {
        if (ids == null)
        {
            return new List<TEntity>();
        }

        var idList = ids.Distinct().ToList();
        if (idList.Count == 0)
        {
            return new List<TEntity>();
        }

        var parameter = Expression.Parameter(typeof(TEntity), "x");
        var property = Expression.Property(parameter, "Id");

        Expression? body = null;
        foreach (var id in idList)
        {
            var idConstant = Expression.Constant(id, typeof(TKey));
            var equals = Expression.Equal(property, idConstant);
            body = body == null ? equals : Expression.OrElse(body, equals);
        }

        if (body == null)
        {
            return new List<TEntity>();
        }

        var lambda = Expression.Lambda<Func<TEntity, bool>>(body, parameter);
        return await repository.GetListAsync(lambda);
    }
}
