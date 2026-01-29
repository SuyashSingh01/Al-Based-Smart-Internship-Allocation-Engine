
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
 

export interface AddBookArg {
    id: number;
    title: string;
    price: number;
}

export interface Book {
    id: number;
    title: string;
    price: number;
}

export interface IQuery {
    index(): string | Promise<string>;
    books(): Book[] | Promise<Book[]>;
    findbooksbyId(bookID: number): Nullable<Book> | Promise<Nullable<Book>>;
}

export interface IMutation {
    deletebooksbyId(bookID: number): Nullable<string> | Promise<Nullable<string>>;
    addBook(addBooksargs: AddBookArg): Nullable<string> | Promise<Nullable<string>>;
    updateBook(bookID: number, updateBooksargs: AddBookArg): string | Promise<string>;
}

type Nullable<T> = T | null;
