using AutoMapper;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Mappings;

/// <summary>
/// AutoMapper profile for the booking domain. Auto-discovered alongside MappingProfile
/// via AddAutoMapper(typeof(MappingProfile)) in Program.cs.
/// </summary>
public class AppointmentMappingProfile : Profile
{
    public AppointmentMappingProfile()
    {
        CreateMap<Appointment, AppointmentResponse>()
            .ForMember(dest => dest.Services, opt => opt.MapFrom(src => src.Resources.OrderBy(r => r.SortOrder).ToList()));

        CreateMap<AppointmentResource, AppointmentServiceSnapshot>();

        CreateMap<ServiceCatalogItem, ServiceCatalogItemResponse>()
            .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Price ?? 0));
    }
}
