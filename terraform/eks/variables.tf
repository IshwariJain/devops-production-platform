variable "eks_public_access_cidr" {
  description = "Public IPv4 CIDR allowed to access the EKS Kubernetes API"
  type        = string
  sensitive   = true

  validation {
    condition = (
      can(cidrhost(var.eks_public_access_cidr, 0)) &&
      can(regex("^[0-9]{1,3}(\\.[0-9]{1,3}){3}/32$", var.eks_public_access_cidr))
    )

    error_message = "Enter a valid public IPv4 address in /32 CIDR format, for example 203.0.113.10/32."
  }
}
