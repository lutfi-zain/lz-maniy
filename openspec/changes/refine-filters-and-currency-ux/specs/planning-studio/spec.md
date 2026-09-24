# Spec Delta: planning-studio

## MODIFIED Requirements

### Requirement: Derived Savings Goals with Multi-Wallet Allocation
The planning studio SHALL display savings goals, tracking target amounts, accumulated savings (including foreign currency wallets converted into IDR via live pegs), days remaining to deadline, and a detailed breakdown of all underlying linked wallets and live conversion rates.

#### Scenario: View Multi-Currency Accumulated Goal Total
- **WHEN** user views the "Sewa Rumah 2026" goal
- **THEN** the total accumulated savings reflects the sum of all contributing IDR wallets plus the converted IDR value of foreign currency wallets (e.g. Bitget 115.61 USDT converted to Rp 2.061.999), matching the live total of Rp 14.230.897,52.
