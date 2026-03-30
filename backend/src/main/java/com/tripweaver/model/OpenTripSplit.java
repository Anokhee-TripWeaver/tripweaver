package com.tripweaver.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "open_trip_split",
        uniqueConstraints = { @UniqueConstraint(columnNames = {"ownerId", "postKey"}) }
)
public class OpenTripSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String ownerId;

    @Column(nullable = false)
    private String postKey;

    @Column(columnDefinition = "LONGTEXT")
    private String dataJson;

    @Column(columnDefinition = "LONGTEXT")
    private String formJson;

    @Column(columnDefinition = "LONGTEXT")
    private String memberFormJson;

    private LocalDateTime updatedAt;

    public OpenTripSplit() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getPostKey() { return postKey; }
    public void setPostKey(String postKey) { this.postKey = postKey; }

    public String getDataJson() { return dataJson; }
    public void setDataJson(String dataJson) { this.dataJson = dataJson; }

    public String getFormJson() { return formJson; }
    public void setFormJson(String formJson) { this.formJson = formJson; }

    public String getMemberFormJson() { return memberFormJson; }
    public void setMemberFormJson(String memberFormJson) { this.memberFormJson = memberFormJson; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
