package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.util.List;

public class AffectationDirectionsVehiculeRequest {

    private List<Long> directionIds;

    public List<Long> getDirectionIds() {
        return directionIds;
    }

    public void setDirectionIds(List<Long> directionIds) {
        this.directionIds = directionIds;
    }
}
