//! Gauss-Legendre quadrature with nodes computed at runtime (Newton's method on
//! the Legendre polynomial) — not hand-entered constants, so any order works.

use std::f64::consts::PI;

/// `(P_n(x), P_n'(x))` via the three-term recurrence.
pub fn legendre(n: usize, x: f64) -> (f64, f64) {
    if n == 0 {
        return (1.0, 0.0);
    }
    let mut p0 = 1.0;
    let mut p1 = x;
    for k in 2..=n {
        let kf = k as f64;
        let pk = ((2.0 * kf - 1.0) * x * p1 - (kf - 1.0) * p0) / kf;
        p0 = p1;
        p1 = pk;
    }
    let dp = n as f64 * (x * p1 - p0) / (x * x - 1.0);
    (p1, dp)
}

/// Nodes and weights of the `n`-point Gauss-Legendre rule on `[-1, 1]`.
///
/// Exact for polynomials up to degree `2n - 1`. Nodes are symmetric about 0.
pub fn gauss_legendre(n: usize) -> (Vec<f64>, Vec<f64>) {
    let mut nodes = vec![0.0; n];
    let mut weights = vec![0.0; n];
    let m = (n + 1) / 2;
    for i in 0..m {
        // initial guess: asymptotic root location, then Newton-polish
        let mut xi = (PI * (i as f64 + 0.75) / (n as f64 + 0.5)).cos();
        for _ in 0..100 {
            let (p, dp) = legendre(n, xi);
            let dx = -p / dp;
            xi += dx;
            if dx.abs() < 1e-15 {
                break;
            }
        }
        let (_, dp) = legendre(n, xi);
        let w = 2.0 / ((1.0 - xi * xi) * dp * dp);
        nodes[i] = -xi;
        nodes[n - 1 - i] = xi;
        weights[i] = w;
        weights[n - 1 - i] = w;
    }
    (nodes, weights)
}

/// Integrate `f` over `[a, b]` with an `n`-point Gauss-Legendre rule.
pub fn integrate<F: Fn(f64) -> f64>(f: F, a: f64, b: f64, n: usize) -> f64 {
    let (nodes, weights) = gauss_legendre(n);
    let half = 0.5 * (b - a);
    let mid = 0.5 * (a + b);
    let mut sum = 0.0;
    for k in 0..n {
        sum += weights[k] * f(mid + half * nodes[k]);
    }
    sum * half
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nodes_are_symmetric_and_weights_sum_to_two() {
        let (nodes, weights) = gauss_legendre(8);
        let wsum: f64 = weights.iter().sum();
        assert!((wsum - 2.0).abs() < 1e-12, "weights sum to interval length");
        for i in 0..nodes.len() {
            assert!((nodes[i] + nodes[nodes.len() - 1 - i]).abs() < 1e-12);
        }
    }

    #[test]
    fn exact_for_polynomials_up_to_degree_2n_minus_1() {
        // 3-point rule is exact through degree 5: ∫_-1^1 x^4 dx = 2/5
        let v = integrate(|x| x.powi(4), -1.0, 1.0, 3);
        assert!((v - 2.0 / 5.0).abs() < 1e-12, "got {v}");
    }

    #[test]
    fn integrates_a_transcendental_function() {
        // ∫_0^pi sin x dx = 2
        let v = integrate(f64::sin, 0.0, PI, 12);
        assert!((v - 2.0).abs() < 1e-10, "got {v}");
    }
}
