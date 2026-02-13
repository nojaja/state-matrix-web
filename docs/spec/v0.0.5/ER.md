@startuml

' ==============================
' Category マスタテーブル(カテゴリマスタ)
' ==============================
entity "CategoryMaster\n(カテゴリマスタ)" as CategoryMaster {
    * ID : uuid ("カテゴリID")
    --
    Name : string ("名称")
    ParentID : uuid ("親カテゴリID, nullable") 
    Level : int ("階層レベル")
    Path : string ("パス") ' 例: /Cat1/Cat2/Cat3
}

' ==============================
' ActionTrigger 型テーブル(実行タイミング型)
' ==============================
entity "ActionTriggerTypes\n(実行タイミング型)" as ActionTriggerTypes {
    * ID : uuid  ("実行タイミング型ID")
    --
    ActionType : int ("アクション種別")
    CategoryID : uuid ("カテゴリID（最下層）")
    ProcessTypeID : uuid ("業務工程型ID")
    Name : string ("名称")
    Description : string ("説明")
    Rollgroup : string ("ロールグループ")
    Timing : string ("タイミング")
    TimingDetail : string ("タイミング詳細")
    CreateTimestamp : Date ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' Artifact 型テーブル(作成物型)
' ==============================
entity "ArtifactTypes\n(作成物型)" as ArtifactTypes {
    * ID : uuid ("作成物型ID")
    --
    CategoryID : uuid ("カテゴリID（最下層）")
    Name : string ("名称")
    Content : string ("内容")
    Note : string ("備考")
    CreateTimestamp : Date ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' 型間の関連
' ==============================
entity "CausalRelationsTypes\n(型間の関連)" as CausalRelationsTypes {
    * ID : uuid ("ID")
    --
    ProcessTypeID : uuid ("業務工程型ID")
    ArtifactTypeID : uuid ("作成物型ID")
    CrudType : string ("CRUD種別")
    CreateTimestamp : Date ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' ProcessTypes テーブル（業務工程型）
' ==============================
entity "ProcessTypes\n（業務工程型）" as ProcessTypes {
    * ID : uuid ("業務工程型ID")
    --
    CategoryID : uuid ("カテゴリID（最下層）")
    Name : string ("業務工程名称")
    Description : string ("説明")
    CreateTimestamp : Date ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' --- リレーション ---

CategoryMaster ||--o{ ActionTriggerTypes : "CategoryID"
CategoryMaster ||--o{ ArtifactTypes      : "CategoryID"
CategoryMaster ||--o{ ProcessTypes           : "CategoryID"
CategoryMaster ||--o{ CategoryMaster     : "ParentID"

ProcessTypes ||--o{ CausalRelationsTypes : "ProcessTypeID"
ArtifactTypes      ||--o{ CausalRelationsTypes : "ArtifactTypeID"

ProcessTypes ||--o{ ActionTriggerTypes : "ProcessTypeID"


@enduml
