package com.webbanhang.shop.Controller.AI;

import com.webbanhang.shop.DTO.AI.AiAdviceRequest;
import com.webbanhang.shop.DTO.AI.AiCompareRequest;
import com.webbanhang.shop.DTO.AI.AiResponse;
import com.webbanhang.shop.Service.AI.AiAdvisorService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiAdvisorService aiAdvisorService;

    public AiController(AiAdvisorService aiAdvisorService) {
        this.aiAdvisorService = aiAdvisorService;
    }

    @PostMapping("/advice")
    public AiResponse advice(@RequestBody AiAdviceRequest req) {
        return aiAdvisorService.advise(
            req.message(), 
            req.topK(), 
            req.userId(), 
            req.guestSessionId(), 
            req.sessionId()
        );
    }

    @PostMapping("/compare")
    public AiResponse compare(@RequestBody AiCompareRequest req) {
        return aiAdvisorService.compare(req.productIds(), req.question());
    }
}
