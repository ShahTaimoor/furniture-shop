import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import categoryService from "./categoriesService";

const formatCategory = (category) => {
  if (!category) return category;
  let level = 0;
  if (typeof category.level === 'number') {
    level = category.level;
  } else if (typeof category.path === 'string' && category.path.trim()) {
    level = category.path.split(' / ').length - 1;
  }
  const path =
    category.path ||
    (Array.isArray(category.ancestors)
      ? [...category.ancestors.map((ancestor) => ancestor.name), category.name].join(' / ')
      : category.name);
  const formattedChildren = Array.isArray(category.children)
    ? category.children.map((child) => formatCategory(child))
    : undefined;

  return {
    ...category,
    level,
    path,
    children: formattedChildren,
  };
};

const enrichTree = (nodes = [], ancestors = []) =>
  nodes.map((node) => {
    const currentPath = [...ancestors, node.name];
    const children = Array.isArray(node.children) ? enrichTree(node.children, currentPath) : [];
    return {
      ...node,
      level: ancestors.length,
      path: currentPath.join(' / '),
      children,
    };
  });

const flattenCategories = (nodes = []) => {
  const list = [];
  const walk = (items) => {
    items.forEach((item) => {
      list.push(item);
      if (item.children?.length) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return list;
};

const withDerivedFields = (category) => {
  const formatted = formatCategory(category);
  const { children, ...rest } = formatted;
  return rest;
};

export const AddCategory = createAsyncThunk(
  'categories/addCategory',
  async (inputValues, thunkAPI) => {
    try {
      const res = await categoryService.createCat(inputValues);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async (payload, thunkAPI) => {
    try {
      const res = await categoryService.updateCat(payload);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id, thunkAPI) => {
    try {
      const res = await categoryService.deleteCat(id);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const AllCategory = createAsyncThunk(
  'categories/allCategory',
  async (params = {}, thunkAPI) => {
    try {
      const res = await categoryService.getAllCat(params);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const SingleCategory = createAsyncThunk(
  'categories/singleCategory',
  async (slug, thunkAPI) => {
    try {
      const res = await categoryService.getSingleCat(slug);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const searchCategories = createAsyncThunk(
  'categories/search',
  async ({ query }, thunkAPI) => {
    try {
      const res = await categoryService.searchCategories({ query });
      return { ...res, query };
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

const initialState = {
  categories: [],
  tree: [],
  status: 'idle',
  error: null,
  currentCategory: null,
  currentStatus: 'idle',
  children: [],
  siblings: [],
  searchResults: [],
  searchStatus: 'idle',
  searchError: null,
  lastSearchQuery: '',
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(AddCategory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(AddCategory.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(AddCategory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(AllCategory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(AllCategory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { tree = [] } = action.payload?.data || {};
        const enrichedTree = enrichTree(tree);
        state.tree = enrichedTree;
        const flatList = flattenCategories(enrichedTree).map((item) => {
          const formatted = formatCategory(item);
          const { children, ...rest } = formatted;
          return rest;
        });
        state.categories = flatList;
      })
      .addCase(AllCategory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(SingleCategory.pending, (state) => {
        state.currentStatus = 'loading';
        state.error = null;
        state.currentCategory = null;
        state.children = [];
        state.siblings = [];
      })
      .addCase(SingleCategory.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded';
        const categoryPayload = action.payload?.data?.category;
        state.currentCategory = formatCategory(categoryPayload);
        state.children = Array.isArray(action.payload?.data?.children)
          ? action.payload.data.children.map(formatCategory)
          : [];
        state.siblings = Array.isArray(action.payload?.data?.siblings)
          ? action.payload.data.siblings.map(formatCategory)
          : [];
      })
      .addCase(SingleCategory.rejected, (state, action) => {
        state.currentStatus = 'failed';
        state.error = action.payload;
        state.currentCategory = null;
        state.children = [];
        state.siblings = [];
      })
      .addCase(deleteCategory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateCategory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(searchCategories.pending, (state) => {
        state.searchStatus = 'loading';
        state.searchError = null;
      })
      .addCase(searchCategories.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        state.lastSearchQuery = action.meta?.arg?.query || '';
        const results = action.payload?.data || [];
        state.searchResults = results.map(withDerivedFields);
      })
      .addCase(searchCategories.rejected, (state, action) => {
        state.searchStatus = 'failed';
        state.searchError = action.payload;
        state.searchResults = [];
      });
  },
});

export default categoriesSlice.reducer;
