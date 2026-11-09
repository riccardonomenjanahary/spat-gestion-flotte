package com.vehicule.Spat.vehicule.spat_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Planificateurs sans dependance metier pour eviter les cycles au demarrage JPA. */
@Configuration
public class SchedulingConfig {
    @Bean(name = "taskScheduler")
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("spat-metier-");
        return scheduler;
    }

    @Bean(name = "gpsTaskScheduler")
    public ThreadPoolTaskScheduler gpsTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("spat-gps-");
        scheduler.setAwaitTerminationSeconds(30);
        return scheduler;
    }

    @Bean(name = "mailDispatchScheduler")
    public ThreadPoolTaskScheduler mailDispatchScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("spat-mail-dispatch-");
        scheduler.setAwaitTerminationSeconds(30);
        return scheduler;
    }

}
