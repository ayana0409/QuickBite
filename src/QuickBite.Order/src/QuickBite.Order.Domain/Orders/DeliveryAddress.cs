using System.Collections.Generic;
using Volo.Abp.Domain.Values;

namespace QuickBite.Order.Orders;

public class DeliveryAddress : ValueObject
{
    public string FullName { get; private set; }

    public string PhoneNumber { get; private set; }

    public string AddressLine { get; private set; }

    public string Ward { get; private set; }

    public string District { get; private set; }

    public string Province { get; private set; }

    public string Note { get; private set; }

    private DeliveryAddress()
    {

    }

    public DeliveryAddress(
        string fullName,
        string phoneNumber,
        string addressLine,
        string ward,
        string district,
        string province,
        string note)
    {
        FullName = fullName;
        PhoneNumber = phoneNumber;
        AddressLine = addressLine;
        Ward = ward;
        District = district;
        Province = province;
        Note = note;
    }

    protected override IEnumerable<object> GetAtomicValues()
    {
        yield return FullName;
        yield return PhoneNumber;
        yield return AddressLine;
        yield return Ward;
        yield return District;
        yield return Province;
        yield return Note;
    }
}