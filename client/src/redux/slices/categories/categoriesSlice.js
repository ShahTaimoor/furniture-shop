import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import categoryService from "./categoriesService";

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
    async ({ name, slug, picture, position }, thunkAPI) => {
        try {
            const res = await categoryService.updateCat({ name, slug, picture, position });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const deleteCategory = createAsyncThunk(
    'categories/deleteCategory',
    async (slug, thunkAPI) => {
        try {
            const res = await categoryService.deleteCat(slug);
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const AllCategory = createAsyncThunk(
    'categories/allCategory',
    async (_, thunkAPI) => {
        try {
            const res = await categoryService.getAllCat();
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

const initialState = {
    categories: [],
    status: 'idle',
    error: null
};

const categoriesSlice = createSlice({
    name: 'categories',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(AddCategory.pending, (state) => { state.status = 'loading'; })
            .addCase(AddCategory.fulfilled, (state, action) => { state.status = 'succeeded'; state.categories.push(action.payload.data); })

            .addCase(AddCategory.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
            .addCase(AllCategory.pending, (state) => { state.status = 'loading'; })
            .addCase(AllCategory.fulfilled, (state, action) => { state.status = 'succeeded'; state.categories = action.payload.data; })
            .addCase(AllCategory.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
            .addCase(SingleCategory.pending, (state) => { state.status = 'loading'; })
            .addCase(SingleCategory.fulfilled, (state, action) => { state.status = 'succeeded'; state.categories = action.payload.data; })
            .addCase(SingleCategory.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
            .addCase(deleteCategory.pending, (state) => { state.status = 'loading'; })
            .addCase(deleteCategory.fulfilled, (state, action) => {
                state.status = 'succeeded';

                state.categories = state.categories.filter(prod => prod._id !== action.payload.id);
            })
            .addCase(deleteCategory.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
            .addCase(updateCategory.pending, (state) => { state.status = 'loading'; })
            .addCase(updateCategory.fulfilled, (state, action) => {
                state.status = 'succeeded';


                const updatedCategory = action.payload.data;

                // Update the category in the array instead of replacing the whole list
                state.categories = state.categories.map((prod) =>
                    prod._id === updatedCategory._id ? updatedCategory : prod
                );

            })
            .addCase(updateCategory.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
           

    }
});

export default categoriesSlice.reducer;
