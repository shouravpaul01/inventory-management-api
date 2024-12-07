import { QueryBuilder } from "../../builder/QueryBuilder";
import { Stock } from "./stock.model";

const getAllStocksDB = async (query: Record<string, unknown>) => {
    console.log(query,'sss')
    const searchableFields = ["name"];
    const mainQuery = new QueryBuilder(
      Stock.find({}).populate("accessory").populate('approvalDetails.approvedBy'),
      query
    )
      .filter()
      .search(searchableFields);
  
    const totalPages = (await mainQuery.totalPages()).totalQuery;
    const paginateQuery = mainQuery.paginate();
    const stock = await paginateQuery.modelQuery;
  
    const result = { data: stock, totalPages: totalPages };
    return result;
  };

  export const StockService={
    getAllStocksDB
  }