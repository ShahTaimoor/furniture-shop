import axiosInstance from '../auth/axiosInstance';

const buildFlatList = (nodes = [], ancestors = []) => {
  const list = [];
  nodes.forEach((node) => {
    const currentPath = [...ancestors, node.name];
    list.push({
      ...node,
      path: currentPath.join(' / '),
      level: ancestors.length,
    });
    if (Array.isArray(node.children) && node.children.length > 0) {
      list.push(...buildFlatList(node.children, currentPath));
    }
  });
  return list;
};

const createCat = async ({ name, parentId = null }) => {
  try {
    const axiosResponse = await axiosInstance.post('/category/create', {
      name,
      parentId,
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(errorMessage);
  }
};

const updateCat = async ({ id, name, parentId }) => {
  try {
    const axiosResponse = await axiosInstance.put(`/category/${id}`, {
      name,
      parentId,
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(errorMessage);
  }
};

const deleteCat = async (id) => {
  try {
    const axiosResponse = await axiosInstance.delete(`/category/${id}`);
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(errorMessage);
  }
};

const getAllCat = async () => {
  try {
    const axiosResponse = await axiosInstance.get('/category/list');
    const payload = axiosResponse.data?.data;

    const treeSource = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.tree)
        ? payload.tree
        : [];

    const flatSource = buildFlatList(treeSource);

    return {
      success: true,
      data: {
        tree: treeSource,
        flat: flatSource,
      },
    };
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(errorMessage);
  }
};

const cloneNode = (node) => ({
  ...node,
  children: Array.isArray(node.children) ? node.children.map(cloneNode) : [],
});

const findNode = (nodes, predicate) => {
  for (const node of nodes) {
    if (predicate(node)) {
      return node;
    }
    if (node.children?.length) {
      const match = findNode(node.children, predicate);
      if (match) {
        return match;
      }
    }
  }
  return null;
};

const getSingleCat = async (slugOrId) => {
  const all = await getAllCat();
  const tree = all.data?.tree ?? [];

  const node = findNode(
    tree,
    (item) => item.slug === slugOrId || item._id === slugOrId
  );

  if (!node) {
    return Promise.reject(new Error('Category not found.'));
  }

  const category = cloneNode(node);
  const children = category.children ?? [];

  let siblings = [];
  if (node.parentId) {
    const parentNode = findNode(tree, (item) => item._id === node.parentId);
    if (parentNode?.children) {
      siblings = parentNode.children
        .filter((child) => child._id !== node._id)
        .map((child) => ({ ...child, children: undefined }));
    }
  } else {
    siblings = tree
      .filter((root) => root._id !== node._id)
      .map((root) => ({ ...root, children: undefined }));
  }

  return {
    success: true,
    data: {
      category,
      children,
      siblings,
    },
  };
};

const searchCategories = async ({ query }) => {
  const all = await getAllCat();
  const flat = Array.isArray(all.data?.flat) ? all.data.flat : [];
  const lower = query.toLowerCase();
  return {
    success: true,
    data: flat.filter(
      (category) =>
        category.name.toLowerCase().includes(lower) ||
        category.slug.toLowerCase().includes(lower) ||
        (category.path || '').toLowerCase().includes(lower)
    ),
  };
};

const categoryService = { createCat, getAllCat, deleteCat, updateCat, getSingleCat, searchCategories };

export default categoryService;
