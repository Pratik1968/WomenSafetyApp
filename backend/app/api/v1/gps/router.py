@router.post("/geofence/check", response_model=GeofenceCheckResponse)
async def check_geofence(payload: GeofenceCheckRequest):
    dist = calculate_haversine_meters(
        payload.current_lat, payload.current_lng,
        payload.center_lat, payload.center_lng
    )
    is_inside = dist <= payload.radius_meters
    return GeofenceCheckResponse(
        is_inside=is_inside,
        distance_meters=round(dist, 1),
        zone_name="Safe Corridor Zone"
    )
