package com.webbanhang.shop.Repository.News;

import com.webbanhang.shop.Model.News.NewsImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsImageRepository extends JpaRepository<NewsImage, Integer> {
    List<NewsImage> findAllByNewsNewsId(Integer newsId);

    List<NewsImage> findAllByNewsNewsIdOrderBySortOrderAsc(Integer newsId);
}
