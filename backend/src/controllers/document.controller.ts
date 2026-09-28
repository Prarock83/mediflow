import { Request, Response, NextFunction } from "express";
import { documentService } from "../services/document.service";

export const createDocumentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const document = await documentService.createDocument(
      userId,
      role,
      req.body
    );

    res.status(201).json({
      status: "success",
      message: "Document created successfully",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const documentId = req.params.id as string;

    const document = await documentService.getDocumentById(
      userId,
      role,
      documentId
    );

    res.status(200).json({
      status: "success",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentsByMedicalRecordIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const medicalRecordId = req.params.medicalRecordId as string;

    const documents = await documentService.getDocumentsByMedicalRecordId(
      userId,
      role,
      medicalRecordId
    );

    res.status(200).json({
      status: "success",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const documentId = req.params.id as string;

    await documentService.deleteDocument(userId, role, documentId);

    res.status(200).json({
      status: "success",
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
