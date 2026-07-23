# CEGS HRMS - Network Access Restrictions & Portals

This repository contains the CEGS Human Resource Management System. 

## Network-Based Access Whitelist

We have implemented a server-side IP whitelisting middleware to ensure that users can only log in from within the office network (WiFi/LAN).

### How it Works
The validation is handled by the `ipWhitelist` middleware (`server/middleware/ipWhitelist.js`), which is registered on the `/auth/login` route.

1. **IP Parser (`ipToInt`)**: Extracts the client's IPv4 address from the request (cleaning up any `::ffff:` IPv6-mapping headers) and converts it to a 32-bit unsigned integer.
2. **Subnet Matcher (`ipInCidr`)**: Uses bitwise subnet mask comparisons to determine if the client's parsed IP falls inside any of the whitelisted ranges.
3. **Response**: 
   * If allowed: Proceeds to verify credentials.
   * If blocked: Return a clean `HTTP 403 Forbidden` response (`"Access denied. Please connect to the office network to log in."`) and logs the blocked attempt with a timestamp to `server/logs/blocked_attempts.log`.

---

### Deployment Configurations (Scenario A vs. Scenario B)

#### Scenario A (On-Premise / Local Server / VPN) - **CURRENTLY ENABLED**
The server directly sees client private IP addresses.
* **Environment Configuration (`server/.env`)**:
  ```env
  ALLOWED_IP_RANGES=10.30.0.0/20,192.168.32.0/22
  TRUST_PROXY=false
  ```

#### Scenario B (Cloud-Hosted)
The server sees only the office's public gateway IP (private IPs are NAT'd).
* **Environment Configuration (`server/.env`)**:
  * Set `ALLOWED_IP_RANGES` to your office's public IP address (e.g. `203.0.113.50`).
  * Set `TRUST_PROXY=true` (or trust a specific proxy range like Cloudflare/Nginx subnets) so Express extracts the original client IP safely from headers without spoofing:
  ```env
  ALLOWED_IP_RANGES=203.0.113.50
  TRUST_PROXY=true
  ```

---

### How to Update IP Ranges in the Future
To update the whitelisted subnets (e.g., if you add a new branch office or update your WiFi range), simply update the `ALLOWED_IP_RANGES` variable in the `server/.env` file:

```env
ALLOWED_IP_RANGES=10.30.0.0/20,192.168.32.0/22,182.50.10.0/24
```
*(Separate multiple CIDR ranges or specific IP addresses using commas.)*

Restart the backend server for changes to take effect.

---

### Running Unit Tests
A dedicated unit test suite is included to verify the IP matching and subnet calculations:
```bash
cd server
npm test
```

---

## Portal Logins (CEGS HRMS)

Below are the default credentials to access the three portals:

### 1. Super Admin Portal
* **Email**: `superadmin@cegs.com`
* **Password**: `Password123`

### 2. HR Admin Portal (Nusrath Hussain)
* **Email**: `nusrath@cegs.com`
* **Password**: `Password123`

### 3. Employee Portal (Madiha Mehak & Others)
* **Email**: `madiha@cegs.com` (First Employee)
* *Alternative employee logins*:
  * `heena@cegs.com` (Heena Beagum)
  * `madhavi@cegs.com` (Madhavi)
  * `raheel@cegs.com` (Mohammed Raheel)
  * `haseeb@cegs.com` (Haseeb)
* **Password**: `Password123`
