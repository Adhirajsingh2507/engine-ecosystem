//! Small, dependency-free numerics.
//!
//! Extracted from ORBIT-TRUST's `orbit_core` so the *general* pieces — runtime
//! Gauss-Legendre quadrature and 3x3 linear algebra — can be reused without the
//! orbital-specific collision-probability code, which stays in orbit-trust.

pub mod quadrature;
pub mod linalg3;
