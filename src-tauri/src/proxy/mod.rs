pub mod interceptor;
pub mod recorder;
pub mod registry;
pub mod server;

/// Default proxy server port — shared across proxy.rs, registry.rs, and frontend constants.ts
pub const DEFAULT_PROXY_PORT: u16 = 9339;
