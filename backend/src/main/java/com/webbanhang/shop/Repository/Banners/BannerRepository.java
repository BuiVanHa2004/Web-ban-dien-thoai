package com.webbanhang.shop.Repository.Banners;

import com.webbanhang.shop.Model.Banners.Banner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BannerRepository extends JpaRepository<Banner, Integer> {
    
    @Query("SELECT b FROM Banner b WHERE b.deletedAt IS NULL")
    List<Banner> findAllActive();

    @Query("SELECT b FROM Banner b WHERE b.deletedAt IS NOT NULL")
    List<Banner> findAllTrashed();
}
