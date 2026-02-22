use serde::Serialize;
use sysinfo::{Disks, Networks, System};
use std::time::Instant;

#[derive(Debug, Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub swap_used: u64,
    pub swap_total: u64,
    pub disk_used: u64,
    pub disk_total: u64,
    pub network_rx_rate: f64,
    pub network_tx_rate: f64,
}

pub struct MetricsCollector {
    system: System,
    networks: Networks,
    disks: Disks,
    last_rx: u64,
    last_tx: u64,
    last_collect: Instant,
}

impl MetricsCollector {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_all();

        let networks = Networks::new_with_refreshed_list();
        let mut total_rx = 0u64;
        let mut total_tx = 0u64;
        for (_name, data) in networks.iter() {
            total_rx += data.total_received();
            total_tx += data.total_transmitted();
        }

        let disks = Disks::new_with_refreshed_list();

        Self {
            system,
            networks,
            disks,
            last_rx: total_rx,
            last_tx: total_tx,
            last_collect: Instant::now(),
        }
    }

    pub fn collect(&mut self) -> SystemMetrics {
        self.system.refresh_cpu_usage();
        self.system.refresh_memory();
        self.networks.refresh(true);
        self.disks.refresh(true);

        let cpu_usage = self.system.global_cpu_usage();

        let memory_used = self.system.used_memory();
        let memory_total = self.system.total_memory();

        let swap_used = self.system.used_swap();
        let swap_total = self.system.total_swap();

        let (mut disk_used, mut disk_total) = (0u64, 0u64);
        for disk in self.disks.iter() {
            let total = disk.total_space();
            let available = disk.available_space();
            disk_total += total;
            disk_used += total.saturating_sub(available);
        }

        let elapsed = self.last_collect.elapsed().as_secs_f64();
        let mut total_rx = 0u64;
        let mut total_tx = 0u64;
        for (_name, data) in self.networks.iter() {
            total_rx += data.total_received();
            total_tx += data.total_transmitted();
        }

        let rx_delta = total_rx.saturating_sub(self.last_rx) as f64;
        let tx_delta = total_tx.saturating_sub(self.last_tx) as f64;
        let network_rx_rate = if elapsed > 0.0 { rx_delta / elapsed } else { 0.0 };
        let network_tx_rate = if elapsed > 0.0 { tx_delta / elapsed } else { 0.0 };

        self.last_rx = total_rx;
        self.last_tx = total_tx;
        self.last_collect = Instant::now();

        SystemMetrics {
            cpu_usage,
            memory_used,
            memory_total,
            swap_used,
            swap_total,
            disk_used,
            disk_total,
            network_rx_rate,
            network_tx_rate,
        }
    }
}
