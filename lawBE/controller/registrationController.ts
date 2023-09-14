import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { role } from "../utils/roles";
import { sendAccountOpeningMail } from "../utils/email";
import { streamUpload } from "../utils/uploadHelper";

const prisma = new PrismaClient();

export const registerUSer = async (req: any, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const salt = await bcrypt.genSalt(10);

    const hashed = await bcrypt.hash(password, salt);

    const value = crypto.randomBytes(16).toString("hex");

    const token = jwt.sign(value, "justRand");

    const user = await prisma.authModel.create({
      data: {
        name,
        email,
        password: hashed,
        token,
        role: role.ADMIN,
      },
    });

    const tokenID = jwt.sign(
      {
        id: user.id,
      },
      "justRand"
    );
    sendAccountOpeningMail(user, tokenID);

    return res.status(201).json({
      message: "User created",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error Registing into our platform",
    });
  }
};

export const registerLawyerAccount = async (req: Request, res: Response) => {
  try {
    const { name, email, password, lawyerID } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const value = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign(value, "justRand");

    const sreachData = [
      {
        id: 1,
      },
      {
        id: 2,
      },
      {
        id: 3,
      },
      {
        id: 4,
      },
    ];

    const findLawyer = sreachData.some((el: any) => el.id === lawyerID);

    if (findLawyer) {
      const user = await prisma.authModel.create({
        data: {
          name,
          email,
          password: hashed,
          token,
          role: role.ADMIN,
        },
      });

      const tokenID = jwt.sign({ id: user.id }, "justRand");
      sendAccountOpeningMail(user, tokenID);

      return res.status(201).json({
        message: "Account created",
        data: user,
      });
    } else {
      return res.status(404).json({
        message: "Please check your Lawyer ID",
      });
    }
  } catch (error) {
    return res.status(404).json({
      message: "Error creating Account",
    });
  }
};

export const signInUSer = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.authModel.findUnique({
      where: { email },
    });

    if (user) {
      const check = await bcrypt.compare(password, user.password);

      if (check) {
        if (user.verified && user.token !== "") {
          const token = jwt.sign(
            {
              id: user.id,
            },
            "secret",
            { expiresIn: "2d" }
          );
          return res.status(201).json({
            message: `Welcome back ${user.name}`,
            user: token,
          });
        } else {
          return res.status(404).json({
            message: "Please go and verify your account",
          });
        }
      } else {
        return res.status(404).json({
          message: "incorrect password",
        });
      }
    } else {
      return res.status(404).json({
        message: "can't find user",
      });
    }
  } catch (error) {
    return res.status(404).json({
      message: "Error signing into our platform",
    });
  }
};

export const verifiedUSer = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const getID: any = jwt.verify(token, "justRand", (err, payload: any) => {
      if (err) {
        return err;
      } else {
        return payload;
      }
    });

    const user = await prisma.authModel.update({
      where: { id: getID.id },
      data: {
        verified: true,
        token: "",
      },
    });

    return res.status(201).json({
      message: "Account verified",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error verifying Account",
    });
  }
};

export const viewUsers = async (req: Request, res: Response) => {
  try {
    const user = await prisma.authModel.findMany({});

    return res.status(200).json({
      message: "Users found",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error viewing Users",
    });
  }
};

export const viewOneUser = async (req: Request, res: Response) => {
  try {
    const { userID } = req.params;
    const user = await prisma.authModel.findUnique({
      where: { id: userID },
    });

    return res.status(200).json({
      message: "User found",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error viewing single User",
    });
  }
};

export const updateUserInfo = async (req: Request, res: Response) => {
  try {
    const { userID } = req.params;
    const { name } = req.body;

    const user = await prisma.authModel.update({
      where: { id: userID },
      data: { name },
    });

    return res.status(201).json({
      message: "user updated",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error updating user",
    });
  }
};

export const updateUserAvatar = async (req: any, res: Response) => {
  try {
    const { userID } = req.params;

    const { secure_url, public_id }: any = await streamUpload(req);

    const user = await prisma.authModel.update({
      where: { id: userID },
      data: { avatar: secure_url, avatarID: public_id },
    });

    return res.status(201).json({
      message: "User image updated",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error updating User Image",
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userID } = req.params;

    await prisma.authModel.delete({
      where: { id: userID },
    });

    return res.status(201).json({
      message: "User deleted",
    });
  } catch (error) {
    return res.status(404).json({
      message: "Error deleting User",
    });
  }
};

export const changeAccountPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const getID: any = jwt.verify(token, "justRand", (err, payload: any) => {
      if (err) {
        return err;
      } else {
        return payload.id;
      }
    });

    const user = await prisma.authModel.findUnique({
      where: { id: getID },
    });

    if (user?.verified && user.token !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      await prisma.authModel.update({
        where: { id: user.id },
        data: {
          password: hashed,
        },
      });

      return res.status(201).json({
        message: "Your password has been changed",
      });
    } else {
      return res.status(404).json({
        message: "can't reset this password",
      });
    }
  } catch (error) {
    return res.status(404).json({
      message: "Error verifying Account",
    });
  }
};

export const resetAccountPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
  
      const user = await prisma.authModel.findUnique({
        where: { email },
      });
  
      if (user?.verified && user.token === "") {
        const token = jwt.sign({ id: user.id }, "justRand");
  
        await prisma.authModel.update({
          where: { id: user.id },
          data: {
            token,
          },
        });
  
        resetAccountPassword(user, token);
  
        return res.status(201).json({
          message: "You can now change your Password",
          data: token,
        });
      } else {
        return res.status(404).json({
          message: "can't reset this password",
        });
      }
    } catch (error) {
      return res.status(404).json({
        message: "Error verifying Account",
      });
    }
  };