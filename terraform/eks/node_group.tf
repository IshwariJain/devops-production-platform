data "aws_iam_role" "eks_node" {
  name = "devops-eks-node-role"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "devops-private-nodes"
  node_role_arn   = data.aws_iam_role.eks_node.arn

  subnet_ids = [
    aws_subnet.private_subnet_a.id,
    aws_subnet.private_subnet_b.id
  ]

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"
  disk_size      = 20

  scaling_config {
    desired_size = 2
    min_size     = 2
    max_size     = 3
  }

  update_config {
    max_unavailable = 1
  }

  tags = {
    Name        = "devops-private-nodes"
    Environment = "dev"
  }
}
