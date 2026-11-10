data "aws_iam_role" "eks_cluster" {
  name = "devops-eks-cluster-role"
}

resource "aws_eks_cluster" "main" {
  name     = "devops-production-eks"
  role_arn = data.aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.private_subnet_a.id,
      aws_subnet.private_subnet_b.id
    ]

    endpoint_private_access = true
    endpoint_public_access  = true

    public_access_cidrs = [var.eks_public_access_cidr]
  }

  tags = {
    Name = "devops-production-eks"
  }
}
